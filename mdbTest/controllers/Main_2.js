const mainRouter = require('express').Router()
const { stringify } = require('querystring')
const IdenFace = require('../models/IdenFace')
const UnknownFace = require('../models/UnknownFace')
const serverVariables = require('../serverVariables')
const axios = require('axios')
const {randomUUID} = require('crypto')

mainRouter.post('', async(req, res) => {
    const body = req.body

    if( !body.FacesVector ){
        if( serverVariables.role === 'master'){
            const newId = randomUUID()
            const receivedAt = Date.now()
            const savedData = await new UnknownFace({
                Track_ID: newId,
                Array: body.Array,
                Name: body.Name,
                Atribute: body.Atribute
            }).save()
            res.status(200).json(savedData)
            console.log(`data is ${savedData} of the type ${typeof savedData}`)
            broadcastToSlaves({...savedData, receivedAt: receivedAt})
            console.log('broadcasted to slaves')
        }else{
            if( body.from && body.from === 'master' ){
                const savedData = await new UnknownFace({
                    Track_ID: body.Track_ID,
                    Array: body.Array || [],
                    Name: body.Name,
                    Atribute: body.Atribute
                }).save()

                res.status(200).json(savedData)
                console.log('received Data from master')
            }else{
                await axios.post(`${serverVariables.master}`, {
                    Name: body.Name,
                    Atribute: body.Atribute || [],
                    Array: body.Array,
                    receivedAt: Date.now()
                })
                res.status(200).send('directed data to master')
            }
        }
    }else{
        if( serverVariables.role === 'master' ){
            const foundData = await IdenFace.findOne({FacesVector: body.FacesVector})
            if( foundData ) {
                if( foundData.Track_ID ){
                    const savedData = await foundData.update({Atribute: body.Atribute})
                    res.status(200).json(savedData)
                    broadcastToSlaves(savedData)
                    console.log('broadcasted iden face data with trackId saved to slaves')
                }else{
                    const newId = randomUUID()
                    foundData.Track_ID = newId
                    foundData.Atribute = body.Atribute
                    const savedData = await foundData.save()
                    res.status(200).json(savedData)
                    broadcastToSlaves(savedData)
                    console.log('broadcasted iden face data without trackId saved to slaves')
                }
            }else{
                const savedData = await new IdenFace({
                    Name: body.Name,
                    Array: body.Array || [],
                    FacesVector: body.FacesVector,
                    Atribute: body.Atribute
                }).save()
                res.status(200).json(savedData)
                broadcastToSlaves(savedData)
                console.log('broadcasted new Iden face data to slaves')
            }
        }else{
            if( body.from && body.from === 'master' ){
                const foundData = await IdenFace.findOne({FacesVector: body.FacesVector})
                // if( foundData ){
                //     if( body.Track_ID ){
                //         foundData.Track_ID = body.Track_ID
                //         foundData.Atribute = body.Atribute
                //         const savedData = await foundData.save()
                //         res.status(200).json(savedData)
                //     }else {
                //         foundData.Atribute = body.Atribute
                //         const savedData = await foundData.save()
                //         res.status(200).json(savedData)
                //     }
                // }else{
                    newData = {
                        Name: body.Name,
                        Array: body.Array || [],
                        FacesVector: body.FacesVector,
                        Atribute: body.Atribute
                    }
                    if( body.Track_ID ) {
                        newData.Track_ID = body.Track_ID
                    }

                    const savedData = await new IdenFace(newData).save()
                    const latency = Date.now(body.receivedAt)
                    console.log(`Latency ${latency} ms for data size ${Buffer.byteLength(JSON.stringify(savedData))} bytes`)
                    res.status(200).json(savedData)

                // }
            }else{
                await axios.post(`${serverVariables.master}`, {
                    FacesVector: body.FacesVector,
                    Name: body.Name,
                    Atribute: body.Atribute,
                    Array: body.Array || [],
                    receivedAt: Date.now()
                })
                res.status(200).send('directed iden face data to master')
            }
        }
    }
})

const broadcastToSlaves = (dat) => {
    const data = dat._doc
    // const currentTime = Date.now()
    const jsonData = {...data, from: 'master'}
    if (!jsonData.receivedAt) {
        jsonData.receivedAt = Date.now()
    }
    for( let slave of serverVariables.slaves ){
        axios.post(`${slave}`, jsonData)
    }
}

module.exports = mainRouter