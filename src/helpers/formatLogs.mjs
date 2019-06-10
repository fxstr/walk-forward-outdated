function pad(nr) {
    return nr < 10 ? `0${nr}` : nr;
}


/**
 * Formats a date
 * @param  {Date} date  Date to format
 * @return {String}
 */
function formatDate(date) {
    let dateString = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    if (date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0) {
        dateString += ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
    return dateString;
}

/**
 * Returns instruments as name1, name2 …
 * @param  {[type]} instruments [description]
 * @return {[type]}             [description]
 */
function formatInstruments(instruments) {
    return instruments.map(instrument => instrument.name).join(', ');
}

/**
 * Returns orders as name1:size1, name2:size2
 * @param  {Map} orders
 * @return {String}
 */
function formatOrders(orders) {
    return Array.from(orders.entries())
        .map(([instrument, order]) => `${instrument.name}:${order.size}`)
        .join(', ') || '—';
}

/**
 * Formats positions for string output.
 * @param  {Map} positionEntry One entry of positions (see BacktestInstance), e.g. gotten through
 * head()
 * @return {String}
 */
function formatPositions(positionEntry) {
    return Array.from(positionEntry.entries())
        .filter(([key]) => key !== 'date' && key !== 'type')
        // t stands for total
        .map(([instrument, position]) => `${instrument.name}:${position.size}@${position.value}t`)
        .join(', ') || '—';
}


export { formatPositions, formatDate, formatInstruments, formatOrders };
