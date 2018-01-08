/**
* Caches data fetched by sources. When we run a backtest with optimizations, data is used 
* multiple times (all data once per optimization run). As we don't want to fetch the data
* from files or servers for every run, we cache it.
*/
export default class DataCache {

	data = [];

	add(data) {

		// Data needs field date and instrument (identifier). If those are not present, we
		// cannot create a named DataSeries

		if (!data.date || !data.instrument) {
			throw new Error(`DataCache: Properties date and instrument must be present on every
				entry you try to add. If they are not, we cannot create a DataSeries out of
				your data.`);
		}

		if (!(data.date instanceof Date)) {
			throw new Error(`DataCache: The date property provided must be an instance of
				Date, is ${ data.date } instead.`);
		}

		this.data.push(data);

	}

}