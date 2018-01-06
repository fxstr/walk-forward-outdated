import DataSeries from './DataSeries';

export default class ObservableDataSeries extends DataSeries {

	callbacks = new Map();

	on(type, callback, properties = []) {
		//if (!type || !callback)
	}



}