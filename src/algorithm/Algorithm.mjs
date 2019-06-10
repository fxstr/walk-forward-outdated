import Instrument from '../instrument/Instrument';
import logger from '../logger/logger';

const { debug } = logger('WalkForward:Algorithm');

export default class Algorithm {

    /**
     * Called from BacktestInstance and propagated through runAlgorithms
     * @param {BacktestInstance} backtest    BacktestInstance that this algorithm belongs to
     */
    setBacktest(backtest) {
        this.backtest = backtest;
    }

    /**
     * Returns the current positions we're holding. Is a wrapper for this.backtest.positions.head()
     * which filters all columns that do not contain instruments.
     * @return {Map}      All positions we're currently holding. Key is the instrument, value an
     *                    object with properties size (amount of instruments we're holding), value
     *                    (value of the position we're holding for the instrument) and positions
     *                    (all sub-positions for the instrument).
     */
    getCurrentPositions() {
        if (!this.backtest.positions.data.length) return new Map();
        const positions = new Map();
        for (const [instrument, position] of this.backtest.positions.head()) {
            if (instrument instanceof Instrument && position.size !== 0) {
                positions.set(instrument, position);
            }
        }
        return positions;
    }

    /**
     * Returns all instruments available. Is a wrapper for this.backtest.instruments.instruments.
     * @return {Array}         All instruments that are currently available
     */
    getInstruments() {
        return this.backtest.instruments.instruments;
    }

    /**
     * Returns the account; is a wrapper for this.backtest.accounts
     * @return {DataSeries}     Accounts, a DataSeries with columns 'cash' and 'invested'.
     */
    getAccounts() {
        return this.backtest.accounts;
    }

    handleClose(orders) {
        debug('onClose method not implemented for %s', this.constructor.name);
        // Just return the original order if class was not derived
        return orders;
    }

    handleNewInstrument() {
        debug('onNewInstrument method not implemented for %s', this.constructor.name);
    }

    /**
     * Listens to newInstrument on backtest's instruments and calls corresponding
     * handlers if available. TODO: Move newInstruments
     * @private
     */
    /* setupInstrumentListeners() {
        this.backtest.instruments.on('newInstrument', (instrument) => {
            if (typeof this.onNewInstrument === 'function') {
                this.onNewInstrument(instrument);
            }
        });
        this.backtest.instruments.on('close', async (data) => {
            if (typeof this.onClose === 'function') {
                const orders = await this.onClose(this.backtest.orders, data.instrument);
                debug('Orders are %o, pass them to backtest', orders);
                // TODO: THIS IS FUCKING WRONG! Only main algorithm (base function) should
                // return/set orders!
                this.backtest.setOrders(orders);
            }
        });
    } */

}
