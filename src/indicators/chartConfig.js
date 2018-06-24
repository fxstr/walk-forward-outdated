export default {
    stoch: {
        name: 'Stochastic Oscillator',
        height: 0.2,
        series: new Map([[
            'stoch_k', 
            {
                type: 'line',
                name: 'Stoch K',
            }
        ], [
            'stoch_d', 
            {
                type: 'line',
                name: 'Stoch D',
            }
        ]])
    },
};