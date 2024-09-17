const UnknownFace = require('../models/UnknownFace')
const IdenFace = require('../models/IdenFace')

const faceRouter = require('express').Router()

faceRouter.get('/iden', async(req, res) => {
    const data = await IdenFace.find({})
    res.json(data)
})

faceRouter.get('/unknown', async(req, res) => {
    const data = await UnknownFace.find({})
    res.json(data)
})

faceRouter.post( '/iden', async( req, res ) => {
    const receivedData = req.body
    for( let d of receivedData ){
        const dataInDb = Iden.findOne({Track_ID: d.Track_ID})
        if(!dataInDb){
            await new Iden({
                Track_ID: d.Track_ID,
                Name: d.Name,
                FacesVector: d.FacesVector,
                Atribute: d.Atribute,
                LastUpdate: d.LastUpdate
            }).save()
        }else{
            
        }
    }
})

module.exports = faceRouter