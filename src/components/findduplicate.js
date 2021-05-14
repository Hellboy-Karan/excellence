import React, { useState } from 'react'

const Findduplicate = () => {
    const array = [1, 2, 3, 4, 4, 5, 6, 7, 7, 8, 8, 9, 9, 10, 11, 12, 13, 14, 14, 15, 15, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 22, 23, 23, 24, 25, 26, 27, 28, 29, 29, 30, 31, 31, 32, 33, 34, 35, 36, 36, 37, 38, 38, 39, 40, 41, 41, 42, 43, 44, 45, 45, 46, 47, 48, 49, 50, 50, 51, 52, 53, 53, 54, 55, 55, 56, 56, 57, 58, 59, 59, 60, 61, 61, 62, 63, 64, 65, 65, 66, 66, 67, 68, 68, 69, 70, 70, 71, 72, 73, 73];
    const arrange = [...array].sort();
    const [obj, setObj] = useState(arrange);
    const [show, setShow] = useState(true)

    const Duplicate = () => {
        const find = obj;
        const duplicates = [];
        for (let i = 0; i < obj.length; i++) {
            if (obj[i + 1] === obj[i]) {
                duplicates.push(obj[i])
            }
        }
        setObj(duplicates)
        setShow(false)
    }

    return (
        <div>
            {show ?
                <h2>Total no of array with <b>duplicate</b> is:- {obj.length}</h2>
                :
                <h2>Total no of <b>duplicate/Twice Repeat</b> array is:- {obj.length}</h2>
            }
            <p>
                {obj.map(obj1 => <div>
                    {obj1}
                </div>)}
            </p>
            {show ?
                <button onClick={Duplicate}>Check Duplicate Number</button>
                :
                <div></div>
            }
            <div>.</div>
        </div>
    )
}

export default Findduplicate
