const test = require('node:test');
const assert = require('node:assert/strict');
const { optimize } = require('../utils/routeOptimizer');
test('visits the closest stop first', () => {
  const result = optimize({ x: 0, y: 0 }, [{ id: 1, x: 100, y: 0 }, { id: 2, x: 10, y: 0 }]);
  assert.deepEqual(result.map(stop => stop.id), [2, 1]);
});
