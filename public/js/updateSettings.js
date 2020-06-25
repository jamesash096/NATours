import axios from 'axios';
import { showAlert } from './alert'

//type is either 'password' or data
export const updateSettings = async (data, type) => {
    try {
        const url = type === 'password' ? 'http://localhost:8080/api/v1/users/updatemypassword' : 'http://localhost:8080/api/v1/users/updateme'
        const res = await axios({
            method: 'PATCH',
            url,
            data
        });
        if(res.data.status === 'Success') {
            showAlert('success', `${type.toUpperCase()} updated successfully!`)
        }
    } catch (err) {
        showAlert('error', err.response.data.message)
    }
}