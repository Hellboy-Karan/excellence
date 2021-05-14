import React, { useState } from 'react'

const Consecutive = () => {
    const [count, setCount] = useState(0)
    const [show, setShow] = useState(true)
    const arr = ['1', '0', '0', '1', '1', '0', '0', '0', '1', '0', '0', '1', '1', '1', '0']


    const MaximumNumber = () => {
        const array = arr;
        let arr1 = [];
        for (let i = 0; i <= array.length; i++) {
            if (array[i] % 2 !== 0) {
                arr1.push(array[i]);
            }
        }
        setCount(count + arr1.length - 1)
        setShow(false)
    }

    return (
        <>
            <div>
                <h2>Max num of consecutive 1's</h2>
                <p>
                    {arr} - Output : <b>{count}</b> [Max num of consecutive 1's is <b>{count}</b>]
                </p>
                {
                    show ?
                        <button onClick={MaximumNumber} >Find Max 1's</button>
                        :
                        <div></div>
                }
            </div>
        </>
    )
}

export default Consecutive
