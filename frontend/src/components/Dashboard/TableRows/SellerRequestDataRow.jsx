import toast from "react-hot-toast";
import useAxiosSecure from "../../../hooks/useAxiosSecure";

const SellerRequestDataRow = ({ req, refetch }) => {
  const axiosSecure = useAxiosSecure();
  const handleRoleUpdate = async () => {
    try {
      const sellerData = {
        id: req._id, 
        email: req.email, 
        role: 'seller',
      };
      await axiosSecure.patch("/update-role", sellerData);
      toast.success("Update successfully");
      refetch();
    } catch (error) {
      console.log(error);
      toast.error(error?.response?.data?.message);
    }
  };
  return (
    <tr>
      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
        <p className="text-gray-900 ">{req?.email}</p>
      </td>

      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
        <span
          onClick={handleRoleUpdate}
          className="relative cursor-pointer inline-block px-3 py-1 font-semibold text-green-900 leading-tight"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-green-200 opacity-50 rounded-full"
          ></span>
          <span className="relative">Make Seller</span>
        </span>
      </td>
    </tr>
  );
};
export default SellerRequestDataRow;
