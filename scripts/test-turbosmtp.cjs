const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: 'pro.eu.turbo-smtp.com',
  port: 587,
  secure: false,
  auth: {
    user: '076737fcf2049510bc74',
    pass: '54UP7TAOWgJqcD0S1paz',
  },
})

transporter
  .sendMail({
    from: 'no-reply@tr-consulting.se',
    to: 'no-reply@tr-consulting.se',
    subject: 'TurboSMTP test',
    text: 'Test mail from local script.',
  })
  .then((info) => {
    console.log('Sent:', info.messageId)
  })
  .catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
  })
