const accessModel = require("../models/accessModel");

const rateLimiting = async (req, res, next) => {
    const sid = req.session.id;
    console.log(sid);
    
    try {
         //find if sid exist in acceessDb not
        const accessDb = await accessModel.findOne({ sessionId: sid });
        console.log(accessDb);
        
        // if not then create an entry, R1
        if (!accessDb) {
            const accessObj = new accessModel({
                sessionId: sid,
                lastReqTime: Date.now(),
            });

            await accessObj.save();
            next();
            return;
        }

        //R2-Rnth, compare the time R(n)-R(n-1)
        console.log((Date.now()- accessDb.lastReqTime) / 1000);

        const diff = (Date.now()- accessDb.lastReqTime) / 1000;

        if (diff < 1){
            return res.send({
                status: 400,
                message: "Too many requests, Please wait for some time.",
            });
        }

       await accessModel.findOneAndUpdate(
        { sessionId: sid },
        { lastReqTime: Date.now() }
       );

      next();
    } catch (error) {
        return res.send({
            status: 500,
            message: "Interval server error",
            error: error,
        });
    }
   
};

 module.exports = rateLimiting;
 //rate for linit