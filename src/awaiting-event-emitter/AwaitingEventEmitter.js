import debug from 'debug';
const log = debug('WalkForward:AwaitingEventEmitter');

export default class AwaitingEventEmitter {

	handlers = new Map();

	/**
	* Adds an event listener
	* @param {string} type			Type of event to listen to
	* @param {function} callback	Callback to call when event of type type is emitted
	*/
	on(type, callback) {
		this.checkType(type);
		if (!callback || typeof callback !== 'function') {
			throw new Error(`AwaitingEventEmitter: Second argument must be a function which handles
				the callbacks.`);
		}

		log('Add handler for type \'%s\'', type);
		if (this.handlers.has(type)) this.handlers.get(type).push(callback);
		else this.handlers.set(type, [callback]);

	}

	/**
	* Emit an event, call all its callbacks and wait until they're completed
	*/
	async emit(type, data) {
		this.checkType(type);
		log('Emit event for type \'%s\' with data %o', type, data);
		const callbacks = this.handlers.get(type);
		if (!callbacks) {
			log('No handlers available for type \'%s\'', type);
			return;
		}
		log('Call %d handlers for type \'%s\'', callbacks.size, type);
		for (const callback of callbacks) {
			await callback(data);
		}
	}


	/**
	* Checks if type passed is a string
	* @private
	*/
	checkType(type) {
		if (!type || typeof type !== 'string') {
			throw new Error(`AwaitingEventEmitter: Pass a string as the first argument to the 
				on method; it holds the type's name.`);
		}
	}


}