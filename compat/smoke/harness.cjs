'use strict';

// A minimal test harness that runs on Node 6: one `ok` / `not ok` line per check,
// and exit code 1 if any check failed.

let passes = 0;
let failures = 0;

exports.check = (name, fn) => {
  try {
    fn();
    passes += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.log(`not ok - ${name}`);
    console.log(String(error && error.message).replace(/^/gm, '    '));
  }
};

/** The error a call throws, reduced to what a consumer can observe, as in compat/consumer.ts. */
exports.thrown = (fn) => {
  try {
    fn();
  } catch (error) {
    return { type: error.constructor.name, message: error.message };
  }
  return 'no error';
};

exports.done = () => {
  console.log(`# ${passes} passed, ${failures} failed`);
  if (failures > 0) {
    process.exitCode = 1;
  }
};
