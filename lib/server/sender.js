
const { Logger, ErrorManager } = require('@reldens/utils');
const ItemsConst = require('../constants');
const ItemsEvents = require('../items-events');

class Sender
{

    constructor(manager, client = false)
    {
        if(!client){
            ErrorManager.error('Undefined client for Sender.');
        }
        this.manager = manager;
        this.client = client;
        // @NOTE: here we will specify which item properties should be sent to the client on each call, potentially you
        // could send the full object, but won't be recommended mostly considering if you don't need all the data.
        this.sendProperties = {};
        this.defineBehaviorForProperties();
        this.listenEvents();
    }

    defineBehaviorForProperties(props)
    {
        if(!props){
            props = {};
        }
        let send = ItemsConst.BEHAVIOR_SEND;
        let broadcast = ItemsConst.BEHAVIOR_BROADCAST;
        // @NOTE: so far I didn't find a case where I would need to broadcast let's say the item key that's been used
        // and some different data to the client, but I'll contemplate that case may happen and keep this as feature.
        // eslint-disable-next-line no-unused-vars
        let both = ItemsConst.BEHAVIOR_BOTH;
        this.setPropertyBehavior(ItemsConst.ACTION_ADD, props, {behavior: send, send: ['key', 'qty']});
        this.setPropertyBehavior(ItemsConst.ACTION_REMOVE, props, {behavior: send, send: ['key']});
        this.setPropertyBehavior(ItemsConst.ACTION_MODIFY_QTY, props, {behavior: send, send: ['key', 'qty']});
        this.setPropertyBehavior(ItemsConst.ACTION_MOD_APPLIED, props, {behavior: send, send: ['key']});
        this.setPropertyBehavior(ItemsConst.ACTION_MOD_REVERTED, props, {behavior: send, send: ['key']});
        // @NOTE: these may be broadcast or both if you like to make changes in the hero appearance or run any
        // animations for all the clients:
        this.setPropertyBehavior(ItemsConst.ACTION_EQUIP, props, {behavior: send, send: ['key']});
        this.setPropertyBehavior(ItemsConst.ACTION_UNEQUIP, props, {behavior: send, send: ['key']});
        // by default we will broadcast the executing item as example:
        this.setPropertyBehavior(ItemsConst.ACTION_EXECUTING, props, {behavior: broadcast, broadcast: ['key']});
        this.setPropertyBehavior(ItemsConst.ACTION_EXECUTED, props, {behavior: send, send: ['key']});
    }

    setPropertyBehavior(act, props, defaultProps)
    {
        if({}.hasOwnProperty.call(props, act)){
            this.sendProperties[act] = props[act];
        }
        this.sendProperties[act] = defaultProps;
    }

    getItemProperties(item, act, behavior)
    {
        let itemProps = {};
        if(!{}.hasOwnProperty.call(this.sendProperties, act)){
            ErrorManager.error(['Undefined action:', act, 'In sendProperties:', this.sendProperties]);
        }
        if(!{}.hasOwnProperty.call(this.sendProperties[act], behavior)){
            ErrorManager.error([
                'Undefined behavior:', behavior, 'Action:', act, 'In sendProperties:', this.sendProperties
            ]);
        }
        for(let prop of this.sendProperties[act][behavior]){
            if({}.hasOwnProperty.call(item, prop)){
                itemProps[prop] = item[prop];
            } else {
                Logger.error(['Undefined property:', prop, 'Item:', item.key]);
            }
        }
        return itemProps
    }

    listenEvents()
    {
        let ownerId = this.manager.owner.id;
        // eslint-disable-next-line no-unused-vars
        this.manager.events.on(ItemsEvents.ADD_ITEM, async (inventory, item) => {
            await this.runBehaviors(item, ownerId, ItemsConst.ACTION_ADD);
        });
        // eslint-disable-next-line no-unused-vars
        this.manager.events.on(ItemsEvents.REMOVE_ITEM, async (inventory, item) => {
            await this.runBehaviors(item, ownerId, ItemsConst.ACTION_REMOVE);
        });
        // eslint-disable-next-line no-unused-vars
        this.manager.events.on(ItemsEvents.MODIFY_ITEM_QTY, async (item, op, key, qty) => {
            await this.runBehaviors(item, ownerId, ItemsConst.ACTION_MODIFY_QTY);
        });
        this.manager.events.on(ItemsEvents.EQUIP_ITEM, async (item) => {
            await this.runBehaviors(item, ownerId, ItemsConst.ACTION_EQUIP);
        });
        this.manager.events.on(ItemsEvents.UNEQUIP_ITEM, async (item) => {
            await this.runBehaviors(item, ownerId, ItemsConst.ACTION_UNEQUIP);
        });
        // @NOTE: check Item class changeModifiers method.
        this.manager.events.on(ItemsEvents.EQUIP+'AppliedModifiers', async (item) => {
            await this.runBehaviors(item, ownerId, ItemsConst.ACTION_MOD_APPLIED);
        });
        this.manager.events.on(ItemsEvents.EQUIP+'RevertedModifiers', async (item) => {
            await this.runBehaviors(item, ownerId, ItemsConst.ACTION_MOD_REVERTED);
        });
        this.manager.events.on(ItemsEvents.EXECUTING_ITEM, async (item) => {
            await this.runBehaviors(item, ownerId, ItemsConst.ACTION_EXECUTING);
        });
        this.manager.events.on(ItemsEvents.EXECUTED_ITEM, async (item) => {
            await this.runBehaviors(item, ownerId, ItemsConst.ACTION_EXECUTED);
        });
    }

    async runBehaviors(item, ownerId, actionName)
    {
        let actionProps = this.sendProperties[actionName];
        if(
            actionProps.behavior === ItemsConst.BEHAVIOR_BROADCAST
            || actionProps.behavior === ItemsConst.BEHAVIOR_BOTH
        ){
            let itemData = this.getItemProperties(item, actionName, ItemsConst.BEHAVIOR_BROADCAST);
            await this.client.broadcast({act: actionName, owner: ownerId, item: itemData});
        } else if(
            actionProps.behavior === ItemsConst.BEHAVIOR_SEND
            || (
                actionProps.behavior === ItemsConst.BEHAVIOR_BOTH
                && actionProps[ItemsConst.BEHAVIOR_SEND] !== actionProps[ItemsConst.BEHAVIOR_BROADCAST]
            )
        ){
            let itemData = this.getItemProperties(item, actionName, ItemsConst.BEHAVIOR_SEND);
            await this.client.send({act: actionName, owner: ownerId, item: itemData});
        }
    }

}

module.exports = Sender;