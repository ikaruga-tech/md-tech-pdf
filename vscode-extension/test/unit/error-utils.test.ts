import * as assert from 'node:assert/strict';
import { getErrorMessage } from '../../src/utils/error-utils.js';

describe('error-utils', () => {
  describe('getErrorMessage', () => {
    it('should extract message from standard Error instance', () => {
      assert.strictEqual(getErrorMessage(new Error('boom')), 'boom');
    });

    it('should return string as-is when error is a string', () => {
      assert.strictEqual(getErrorMessage('boom'), 'boom');
    });

    it('should convert number error to string', () => {
      assert.strictEqual(getErrorMessage(123), '123');
    });

    it('should safely handle null and undefined', () => {
      assert.strictEqual(getErrorMessage(null), 'null');
      assert.strictEqual(getErrorMessage(undefined), 'undefined');
    });

    it('should stringify plain object', () => {
      assert.strictEqual(getErrorMessage({ message: 'custom' }), '[object Object]');
    });
  });
});
