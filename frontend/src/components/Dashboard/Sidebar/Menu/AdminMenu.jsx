import { FaUserAstronaut, FaUserCog } from 'react-icons/fa'
import MenuItem from './MenuItem'

const AdminMenu = () => {
  return (
    <>
      <MenuItem icon={FaUserCog} label='Manage Users' address='manage-users' />
      <MenuItem  icon={FaUserAstronaut} label='seller Users' address='seller-request' />
    </>
  )
}

export default AdminMenu
