import React, { useState } from 'react'

const EvenNumber = () => {
    const [array, setArray] = useState(['1', '23', '42', '11', '72', '76', '32', '14', '7', '13', '18', '77', '90']);
    const [text, setText] = useState('All Number');
    const [show, setShow] = useState(true);

    const handleClick = () => {
        let arr = [];
        for (let i = 0; i <= array.length; i++) {
            if (array[i] % 2 === 0) {
                arr.push(array[i]);
            }
            setArray(arr);
            setText('Even Number');
            setShow(false)
        }
    }

    return (
        <>
            <div>
                <h1>{text}</h1>
                {
                    array.map(data => <div>
                        {data}<br />
                    </div>)
                }
                {
                    show ?
                        <button onClick={handleClick}>Click For Even Number</button>
                        :
                        <div></div>
                }

            </div>

        </>
    )
}

export default EvenNumber


