import express from 'express'
const router = express.Router()

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN
// Set this to any secret string you choose
// Example: "zeroops_webhook_2026"

// ── STEP 1: Verification endpoint (GET)
// Meta calls this once to verify your webhook is real
router.get('/webhook/whatsapp', (req, res) => {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ WhatsApp webhook verified')
        res.status(200).send(challenge) // send back the challenge
    } else {
        console.error('❌ Webhook verification failed')
        res.sendStatus(403)
    }
})

// ── STEP 2: Receive messages (POST)
// Meta sends all incoming WhatsApp messages here
router.post('/webhook/whatsapp', (req, res) => {
    const body = req.body

    if (body.object === 'whatsapp_business_account') {
        body.entry?.forEach((entry: any) => {
            entry.changes?.forEach((change: any) => {
                const value = change.value

                // Incoming message from customer
                if (value.messages) {
                    value.messages.forEach((msg: any) => {
                        const from = msg.from       // customer phone
                        const text = msg.text?.body // message text
                        const timestamp = msg.timestamp

                        console.log(📨 WhatsApp from ${ from }: ${ text })

                        // Save to DB for WhatsApp Conversations panel
                        saveIncomingMessage({
                            phone: from,
                            message: text,
                            timestamp: new Date(Number(timestamp) * 1000),
                            direction: 'incoming'
                        })
                    })
                }

                // Message status updates (sent/delivered/read)
                if (value.statuses) {
                    value.statuses.forEach((status: any) => {
                        console.log(📬 Message status: ${ status.status })
                    })
                }
            })
        })
        res.sendStatus(200) // always respond 200 to Meta
    } else {
        res.sendStatus(404)
    }
})