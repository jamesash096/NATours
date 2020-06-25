import axios from 'axios'
import {showAlert} from './alert'

const stripe = Stripe('pk_test_51GxoOFDjg3B9rMWfe24ci0vJiZMomXodC2WQ0TVi1gqPuO7Aarq30Ufl2U4O9qZrOp3URDIop6qwKtr75oXrZwMV00xpuLhe4J')

export const bookTour = async tourId => {
    try {
        //Get checkout session from API
        const session = await axios(`http://localhost:8080/api/v1/bookings/checkout-session/${tourId}`);
        await stripe.redirectToCheckout({
            sessionId: session.data.session.id
        })
    } catch (err) {
        showAlert('Error', err)
    }
}