export default {
    stoch: {
        chart: {
            name: 'Stochastic Oscillator',
            height: 0.2,
        },
        series: new Map([[
            'stoch_k', 
            {
                type: 'line',
                color: 'red',
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