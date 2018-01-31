'use strict';
const Color = require('./node_modules/color');
const eases = require('./node_modules/eases');


module.exports = (startColor, endColor, opts, cb) => {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }

    opts = Object.assign({
        duration: 1000,
        timing: 'linear',
        threshold: 60,
        iterations: 1
    }, opts);

    let tick;
    let elapsed;
    let first;
    let iterationCount = 0;

    if (opts.threshold) {
        tick = setTimeout;
    } else {
        tick = setImmediate || process.nextTick || setTimeout;
    }

    if (typeof opts.timing === 'string') {
        opts.timing = eases[opts.timing];

        if (!opts.timing) {
            throw new Error('Unknown timing function');
        }
    }

    const colors = [new Color(startColor), new Color(endColor)];

    function reset() {
        elapsed = 0;
        first = new Date().getTime();
    }

    function next(startColor, endColor, lastTime) {
        const currTime = new Date().getTime();
        const idealTimeToCall = 1000 / opts.threshold;
        let timeToCall;

        if (opts.threshold) {
            timeToCall = idealTimeToCall;
        }

        // ignore the first call
        if (lastTime) {
            const delta = currTime - lastTime;

            if (opts.threshold) {
                if (delta > idealTimeToCall * 2) {
                    timeToCall = 0;
                } else {
                    timeToCall = (idealTimeToCall * 2) - delta;
                }
            }

            // ignore if next is called too quickly
            if (delta) {
                elapsed += delta;
                const {timing, duration} = opts;
                const percent = 1 - timing(elapsed / duration);
                const colorResult = endColor.mix(startColor, percent);

                if (currTime >= first + duration) {
                    // last call, flush out color2
                    if (iterationCount < opts.iterations || opts.iterations === true) {
                        cb(colorResult.rgb().round().array(), delta, iterationCount, false);
                        next(startColor, endColor);
                    } else {
                        cb(colorResult.rgb().round().array(), delta, iterationCount, true);
                    }

                    return;
                }

                if (cb(colorResult.rgb().round().array(), delta, iterationCount, false) === false) {
                    return;
                }
            }
        } else {
            // first call
            iterationCount++;
            reset();
        }

        tick(() => {
            // if tick is setImmediate or process.nextTick, we ignore timeToCall
            next(startColor, endColor, currTime);
        }, timeToCall);
    }

    next(colors[0], colors[1]);
};
