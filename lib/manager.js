/**
 *
 * Reldens - Items System - ItemsManager
 *
 */

const { ErrorManager } = require('@reldens/utils');
const Inventory = require('./item/inventory');
const ItemsEvents = require('./items-events');

class ItemsManager extends Inventory
{

    constructor(props)
    {
        super(props);
        if(!{}.hasOwnProperty.call(props, 'owner')){
            ErrorManager.error('Undefined owner.');
        }
        this.itemClasses = {}.hasOwnProperty.call(props, 'itemClasses') ? props.itemClasses : false;
        this.groupClasses = {}.hasOwnProperty.call(props, 'groupClasses') ? props.groupClasses : false;
        this.ownerIdProperty = {}.hasOwnProperty.call(props, 'ownerIdProperty') ? props.ownerIdProperty : 'id';
        this.owner = props.owner;
        this.groups = {};
    }

    getOwnerId()
    {
        return this.owner[this.ownerIdProperty];
    }

    setup(props)
    {
        this.events.emit(ItemsEvents.MANAGER_INIT, {props: props, manager: this});
        if({}.hasOwnProperty.call(props, 'items')){
            this.setItems(props.items);
        }
        if({}.hasOwnProperty.call(props, 'groups')){
            this.setGroups(props.groups);
        }
    }

}

module.exports = ItemsManager;
