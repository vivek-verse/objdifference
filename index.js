const crypto = require("crypto");

class ObjectDifference{
	diff(a, b, stack= [], options = {inc : true}, top = true, garbage = {}){
		stack = this.arrize(stack);
		const aKeys = Object.keys(a).sort();
		const bKeys = Object.keys(b).sort();
		const aN = aKeys.length;
		const bN = bKeys.length;
		let aI = 0;
		let bI = 0;
		let delta = {
			$rename : {},
			$unset: {},
			$set: {},
			$inc : {}
		}

		const unsetA = (i) => {
      const key = stack.concat(aKeys[i]).join(".");
      delta.$unset[key] = true;
      const h = this.digest(a[aKeys[i]]);
      return (garbage[h] || (garbage[h] = [])).push(key);
    };
    const setB = (i) => {
      const skey = stack.concat(bKeys[i]).join(".");
      return (delta.$set[skey] = b[bKeys[i]]);
    };
    const incA = (i, d) => {
      const ikey = stack.concat(aKeys[i]).join(".");
      return (delta.$inc[ikey] = d);
    };
    while (aI < aN && bI < bN) {
      const aKey = aKeys[aI];
      const bKey = bKeys[bI];
      if (aKey === bKey) {
        const aVal = a[aKey];
        const bVal = b[bKey];
        switch (false) {
          case aVal !== bVal:
            break;
          case !(
            (aVal != null && bVal == null) ||
            (aVal == null && bVal != null)
          ):
            setB(bI);
            break;
          case !(aVal instanceof Date && bVal instanceof Date):
            if (+aVal !== +bVal) {
              setB(bI);
            }
            break;
          case !(aVal instanceof RegExp && bVal instanceof RegExp):
            if ("" + aVal !== "" + bVal) {
              setB(bI);
            }
            break;
          case !(this.isPlainObject(aVal) && this.isPlainObject(bVal)):
            const _ref = this.diff(
              aVal,
              bVal,
              stack.concat([aKey]),
              options,
              false,
              garbage
            );
            for (const k in _ref) {
              if (_ref[k]) {
                const v = _ref[k];
                for (const k2 in v) {
                  if (v[k2]) {
                    const v2 = v[k2];
                    delta[k][k2] = v2;
                  }
                }
              }
            }

            break;
          case !(
            !this.isPlainObject(aVal) &&
            !this.isPlainObject(bVal) &&
            this.digest(aVal) === this.digest(bVal)
          ):
            break;
          default:
            if (options.inc === true && this.isRealNumber(aVal, bVal)) {
              incA(aI, bVal - aVal);
            } else {
              setB(bI);
            }
        }
        ++aI;
        ++bI;
      } else {
        if (aKey < bKey) {
          unsetA(aI);
          ++aI;
        } else {
          setB(bI);
          ++bI;
        }
      }
    }
    while (aI < aN) {
      unsetA(aI++);
    }
    while (bI < bN) {
      setB(bI++);
    }
    if (top) {
      const collect = (() => {
        const _ref1 = delta.$set;
        const _results = [];
        for (const k in _ref1) {
          if (_ref1[k]) {
            const v = _ref1[k];
            const h = this.digest(v);
            if (garbage[h] != null) {
              const key = garbage[h].pop();
              _results.push([k, key]);
            }
          }
        }
        return _results;
      })();
      for (let _i = 0, _len = collect.length; _i < _len; _i++) {
        const e = collect[_i];
        const k = e[0];
        const key = e[1];
        delta.$rename[key] = k;
        delete delta.$unset[key];
        delete delta.$set[k];
      }
    }
    for (const k in delta) {
      if (Object.keys(delta[k]).length === 0) {
        delete delta[k];
      }
    }
    if (Object.keys(delta).length === 0) {
      delta = false;
    }
    return delta;
  }

  digest(
    a,
    algorithm = "sha1",
    inputEncoding = "utf8",
    outputEncoding = "hex"
  ) {
    const h = crypto.createHash(algorithm);
    const u = (...args) => h.update(args.join(":"), inputEncoding);
    const d = (obj) => {
      return this.digest(obj,
        algorithm,
        inputEncoding,
        outputEncoding);
    }
    switch (true) {
      // undefined
      case typeof a === "undefined":
        u("u");
        break;

      // null
      case a === null:
        u("n");
        break;

      // boolean
      case typeof a === "boolean":
      case a instanceof Boolean:
        u("f", a.valueOf());
        break;

      // number
      case typeof a === "number":
      case a instanceof Number:
        u("i", `${a}`);
        break;

      // string
      case typeof a === "string":
      case a instanceof String:
        u("s", `${a}`);
        break;

      // symbol
      case typeof a === "symbol":
      case a instanceof Symbol:
        u("S", `${a}`);
        break;

      // date
      case a instanceof Date:
        u("d", a.toISOString());
        break;

      // regexp
      case a instanceof RegExp:
        u("x", `${a}`);
        break;

      // function
      case a instanceof Function:
        u("F", a.toString());
        break;

      // array
      case Array.isArray(a):
        u("[");
        a.forEach((e) => u("a", d(e)));
        u("]");
        break;

      // object
      default:
        u("{");
        Object.keys(a)
          .sort()
          .forEach((k) => u("k", d(k), "v", d(a[k])));
        u("}");
        break;
    }
    return h.digest(outputEncoding);
  }

   isRealNumber(...args) {
    return args.every((e) => {
      return (
        typeof e === "number" &&
        isNaN(e) === false &&
        e !== +Infinity &&
        e !== -Infinity
      );
    });
  }

  isPlainObject(a) {
    return a !== null && typeof a === "object";
  }

  arrize(path, glue) {
    if (glue == null) {
      glue = ".";
    }
    return (() => {
      if (Array.isArray(path)) {
        return path.slice(0);
      } else {
        switch (path) {
          case void 0:
          case null:
          case false:
          case "":
            return [];
          default:
            return path.toString().split(glue);
        }
      }
    })()
      .map((e) => {
        switch (e) {
          case void 0:
          case null:
          case false:
          case "":
            return null;
          default:
            return e.toString();
        }
      })
      .filter((e) => {
        return e != null;
      });
  }
}

module.exports = new ObjectDifference()