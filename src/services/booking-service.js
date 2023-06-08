const axios = require('axios');

const { BookingRepository } = require('../repository/index');
const { FLIGHT_SERVICE_PATH, AUTH_SERVICE_PATH, AIRBOOKING_SERVICE_PATH } = require('../config/serverConfig');
const { ServiceError } = require('../utils/errors');

class BookingService {
    constructor() {
        this.bookingRepository = new BookingRepository();
    }

    async createBooking(data) {
        try {


            const flightId = data.flightId;

            const getFlightRequestURL = `${FLIGHT_SERVICE_PATH}/api/v1/flights/${flightId}`;

            const response = await axios.get(getFlightRequestURL);

            const flightData = response.data.data;
            console.log(flightData)
            let priceOfTheFlight = flightData.price;
            if (data.noOfSeats > flightData.totalSeats) {
                console.log("iof")
                throw new ServiceError('Something went wrong in the booking process', 'Insufficient seats in the flight');
            }
            const totalCost = priceOfTheFlight * data.noOfSeats;
            const bookingPayload = {...data, totalCost };

            const booking = await this.bookingRepository.create(bookingPayload);

            const updateFlightRequestURL = `${FLIGHT_SERVICE_PATH}/api/v1/flights/${booking.flightId}`;

            await axios.patch(updateFlightRequestURL, { totalSeats: flightData.totalSeats - booking.noOfSeats });
            const finalBooking = await this.bookingRepository.update(booking.id, { status: "Booked" });

            console.log("Before User response")
            const userId = data.userId;
            const getUserRequestURL = `${AUTH_SERVICE_PATH}/api/v1/getUser/${userId}`;

            const responseFromUser = await axios.get(getUserRequestURL);

            const userMail = responseFromUser.data.data.email;
            console.log(userMail)
            const publishData = {
                recepientRmail: userMail,
                currentTime: new Date(),
                message: "Congratulation!! your Booking has Been Done "
            }

            const getPublishRequestURL = `${AIRBOOKING_SERVICE_PATH}/api/v1/publish`;
            console.log(getPublishRequestURL)
                // const responseAfterPublsh = await axios.post(getPublishRequestURL, publishData);
            return finalBooking;
        } catch (error) {
            //console.log("error");
            console.log(error)
            if (error.name == 'RepositoryError' || error.name == 'ValidationError') {
                throw error;
            }
            throw new ServiceError();
        }
    }
}

module.exports = BookingService;