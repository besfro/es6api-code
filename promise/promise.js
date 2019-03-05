class PromisesData {
    constructor() {
        this.states = {
            0: 'pendding',
            1: 'resolved',
            2: 'rejected'
        }
        //callback 返回值
        this.value = ''
        //callback Array: reslove、 reject、 catch
        this.callbackArr = []
        this.setState()
    }

    // 传入一个 PromiseData 实例去更新数据
    updateData(data) {
        data instanceof PromisesData && Object.assign(this, data)
    }

    setState(val = 0) {
        this.state = val
        this.stateText = this.states[val]
    }

    setValue(val) {
        this.value = val
    }

    isResloved() {
        return this.state === 1
    }

    isRejected() {
        return this.state === 2
    }

}

class Promises {
    constructor(fn) {
        this.info = new PromisesData();
        // Promise callback
        this.info.callback = fn
        this.error = {
            0: 'Promise resolver undefined is not a function',
            1: 'Uncaught in promise'
        }
        this.tryPromise()
    }

    // try Promise callback
    tryPromise() {
        const fn = this.info.callback
        if(fn) {
            try {
                fn(this.context(this.reslove), this.context(this.reject))
            } catch(e) {
                this.handlerErr(e)
            }
        } else {
            this.handlerErr(0)
        }
    }

    // 判断是否为 Promise 实例
    isPromise(o) {
        return o instanceof Promises
    }

    reslove(val) {
        this.info.setState(1)
        this.next(val)
    }

    reject(val) {
        this.info.setState(2)
        this.next(val)
    }

    next(val) {
        this.info.setValue(val)
        this.callbackRun()
    }

    // 运行 callbackArr 里的方法
    callbackRun() {
        const info = this.info
        const callbackArr = info.callbackArr
        const firstFn = callbackArr.shift()

        firstFn 
            ? (() => {
                if(info.isResloved() && firstFn.reslove) {
                    this.context(firstFn.reslove)()
                } else if(info.isRejected()) {
                    // rejected 执行 then reject 或者 catch
                    firstFn.reject ? this.context(firstFn.reject)() : 
                        firstFn.catch ? this.context(firstFn.catch)() : null
                }

                if(this.isPromise(this.info.value)) {
                    // 返回值是个 Promise 实例时执行
                    this.isPromiseValue()
                } else if(callbackArr.length > 0) {
                    // 递归继续调用
                    this.callbackRun()
                }
            })() 
            // 没有callback传递错误 抛出错误
            : info.isRejected() && this.handlerErr(1)
    }

    // 状态为 fulfilled 时执行
    isNeedCallbackRun() {
        if(this.info.isResloved() || this.info.isRejected()) {
            this.callbackRun()
        }
    }

    then(resloveFn, rejectFn) {
        const info = this.info 
        // 添加回调方法
        info.callbackArr.push({
            reslove: resloveFn && this.wrapp(resloveFn) || null,
            reject: rejectFn && this.wrappReject(rejectFn) || null,
            catch: null
        })
        // promise 状态为 fulfilled, 立即执行回调
        this.isNeedCallbackRun()
        // 返回一个新的 Promise
        return this.newPromises()
    }

    catch(catchFn) {
        const info = this.info 
        // 添加回调方法
        info.callbackArr.push({
            reslove: null,
            reject: null,
            catch: catchFn && this.wrappReject(catchFn) || null
        })
        this.isNeedCallbackRun()
        return this.newPromises()
    }

    isPromiseValue() {
        let [info, newOne, newInfo] = [this.info, this.info.value, this.info.value.info]
        // 如果返回值为 Promise 实例, 将未执行的回调传递给该实例
        newInfo.callbackArr = newInfo.callbackArr.concat(info.callbackArr)
        // 是否执行回调
        newOne.isNeedCallbackRun()
    }

    // 创建一个新 Promise
    newPromises() {
        let [newOne, reValue] = [, this.info.value]
        if(this.isPromise(reValue)) {
            newOne = reValue
        } else {
            newOne = new Promises(() => {})
            // 将状态更新到新 Promise
            newOne.info.updateData(this.info)
        }

        return newOne
    }

    // 包装 then 传递的 resolve callback
    wrapp(fn) {
        return function() {
            const value = fn && fn(this.info.value)
            this.info.setValue(value)
        }
    }

    // 包装 then 传递的 reject callback 或者 catch callback
    wrappReject(fn) {
        return function() {
            this.context(this.wrapp(fn))()
            // catch callback 调用后状态为 reslove
            this.info.setState(1)
        }
    }

    handlerErr(errCode) {
        const errorMsg = this.error[errCode] || errCode
        // 状态变更为 rejected
        this.info.setState(2)
        // setTimeout 使得这个处理方法在 then 或者 catch 之后
        // 如果存在传递方法不抛出错误
        setTimeout(this.context(function() {
            if(this.info.callbackArr.length > 0) {
                this.reject(errorMsg)
            } else if(this.info.isRejected()) {
                throw new Error(errorMsg)
            }
        }))
    }

    context(fn) {
        return fn.bind(this)
    }
}

export default Promise