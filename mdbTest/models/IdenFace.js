const mongoose = require('mongoose')
const {randomUUID} = require('crypto')

const idenFaceSchema = new mongoose.Schema({
    Track_ID: {
        type: String,
        required: false
        // default: () => randomUUID()
        // unique: true
    },
    Name: {
        type: String, 
        required: true
    },
    FacesVector: {
        type: String,
        required: true
    },
    Atribute: {
        type: String,
        required: true
    },
    Array: {
        type: Array,
        required: true
    }
    // LastUpdate: {
    //     type: Number,
    //     required: true
    // }
})

mongoose.set('toJSON', {
    transform: (doc,ret)=> {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
    }
})


module.exports = mongoose.model('IdenFace', idenFaceSchema)