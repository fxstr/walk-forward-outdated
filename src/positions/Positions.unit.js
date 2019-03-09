import test from 'ava';
import Positions from './Positions';
import Instrument from '../instrument/Instrument';

test('returns empty map if there are no positions', (t) => {
    const pos = new Positions();
    t.deepEqual(pos.getPositions(), new Map());
});

test('getPositions returns map with positions (but not date or type)', (t) => {
    const pos = new Positions();
    const instrument1 = new Instrument('inst1');
    const instrument2 = new Instrument('inst2');
    pos.add(new Map([
        ['date', new Date()],
        ['type', 'open'],
        [instrument1, 'inst1Data'],
        [instrument2, 'inst2Data'],
    ]));
    t.deepEqual(pos.getPositions(pos.head()), new Map([
        [instrument1, 'inst1Data'],
        [instrument2, 'inst2Data'],
    ]));
});
