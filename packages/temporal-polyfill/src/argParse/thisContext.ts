
// TODO: apply to all other types of objects
export function ensureThisContext<Obj>(
  ObjClass: { prototype: Obj },
): void {
  const proto = ObjClass.prototype as any

  Object.getOwnPropertyNames(ObjClass.prototype).forEach((methodName: string) => {
    if (methodName !== 'constructor') {
      // not a getter
      if (!Reflect.getOwnPropertyDescriptor(proto, methodName)?.get) {
        const origMethod = proto[methodName]

        if (typeof origMethod === 'function') { // necessary?
          // eslint-disable-next-line func-style
          const newMethod = function(this: Obj) {
            // https://stackoverflow.com/questions/367768/how-to-detect-if-a-function-is-called-as-constructor
            if (new.target) {
              throw new TypeError('Cannot call as constructor')
            }

            if (!(this instanceof (ObjClass as any))) {
              throw new TypeError(`this-context must be a ${proto[Symbol.toStringTag]}`)
            }
            // eslint-disable-next-line prefer-rest-params
            return origMethod.apply(this, arguments as any)
          }

          Object.defineProperty(newMethod, 'name', {
            value: methodName,
            // necessary options for a read-only property
            writable: false,
            enumerable: false,
            configurable: true,
          })

          Object.defineProperty(newMethod, 'length', {
            value: origMethod.length,
            // necessary options for a read-only property
            writable: false,
            enumerable: false,
            configurable: true,
          })

          proto[methodName] = newMethod
        }
      }
    }
  })
}
