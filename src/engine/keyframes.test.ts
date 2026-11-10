import { describe, expect, it } from 'vitest';
import { evaluateTrack, removeKeyframe, sortKeyframes, upsertKeyframe } from './keyframes';
const keys = [{ id: 'b', time: 2, value: 1 }, { id: 'a', time: 0, value: 0 }];
describe('keyframe tracks', () => {
 it('sorts without mutating input', () => { expect(sortKeyframes(keys).map(k => k.id)).toEqual(['a','b']); expect(keys[0].id).toBe('b'); });
 it('holds endpoints and interpolates', () => { expect(evaluateTrack(-1,keys)).toBe(0); expect(evaluateTrack(1,keys)).toBe(0.5); expect(evaluateTrack(3,keys)).toBe(1); });
 it('replaces a key at the same time', () => { expect(upsertKeyframe(keys,{id:'c',time:2,value:4})).toEqual([{id:'a',time:0,value:0},{id:'c',time:2,value:4}]); });
 it('removes by id', () => expect(removeKeyframe(keys,'a')).toEqual([keys[0]]));
});
