import React, { useState } from 'react';

const Sortarray = () => {

    const data = [
        {
            id: 4,
            name: 'Number-4'
        },
        {
            id: 10,
            name: 'Number-10'
        },
        {
            id: 5,
            name: 'Number-5'
        },
        {
            id: 6,
            name: 'Number-6'
        }
    ]

    data.sort(function (a, b) {
        if (a.id < b.id)
            return -1;
        if (a.id > b.id)
            return 1;
        return 0;
    })
    console.log(data)
    return (
        <>

        </>
    )
}

export default Sortarray
