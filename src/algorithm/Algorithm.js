import Instrument from '../instrument/Instrument';

export default class Algorithm {

    /**
     * Called from BacktestInstance and propagated through runAlgorithms
     * @param {[type]} backtest [description]
     * @private
     */
    setBacktest(backtest) {
        this.backtest = backtest;
        this.setupInstrumentListeners();
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
        for (const [key, value] of this.backtest.positions.head()) {
            if (key instanceof Instrument) positions.set(key, value);
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

    /**
     * Listens to newInstrument and close events on backtest's instruments and calls corresponding
     * handlers if available.
     * @private
     */
    setupInstrumentListeners() {
        this.backtest.instruments.on('newInstrument', (instrument) => {
            if (typeof this.onNewInstrument === 'function') {
                this.onNewInstrument(instrument);
            }
        });
        this.backtest.instruments.on('close', async (data) => {
            if (typeof this.onClose === 'function') {
                const orders = await this.onClose(this.backtest.orders, data.instrument);
                this.backtest.setOrders(orders);
            }
        });
    }

}