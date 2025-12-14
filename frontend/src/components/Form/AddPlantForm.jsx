import { useForm } from "react-hook-form";
import { imageUpload } from "../../utils";
import useAuth from "../../hooks/useAuth";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import LoadingSpinner from "../Shared/LoadingSpinner";
import ErrorPage from "../../pages/ErrorPage";
import toast from "react-hot-toast";
import { TbFidgetSpinner } from "react-icons/tb";
import useAxiosSecure from "../../hooks/useAxiosSecure";

const AddPlantForm = () => {
  const { user } = useAuth();
  const axiosSecure = useAxiosSecure();
  const {
    isPending,
    isError,
    mutateAsync,
    reset: mutationReset,
  } = useMutation({
    mutationFn: async (payLoad) =>
      await axiosSecure.post(`/plants`, payLoad),
    onSuccess: (data) => {
      console.log(data);
      // toaster
      toast.success("Plant added successfully");
      // reset
      mutationReset();
    },
    onError: (error) => {
      console.log(error);
    },
    onMutate: (payLoad) => {
      console.log("I wil post this data", payLoad);
    },
    onSettled: (data, error) => {
      if (data) console.log(data);
      if (error) console.log(error);
    },
    retry: 3,
  });
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    const { name, price, category, image, description, quantity } = data;
    const imageFile = image[0];

    try {
      const imageUrl = await imageUpload(imageFile);
      const plantData = {
        image: imageUrl,
        name,
        price: Number(price),
        quantity: Number(quantity),
        category,
        description,
        seller: {
          image: user?.photoURL,
          name: user?.displayName,
          email: user?.email,
        },
      };
      await mutateAsync(plantData);
      reset();
    } catch (error) {
      console.log(error);
    }
  };
  if (isPending) return <LoadingSpinner></LoadingSpinner>;
  if (isError) return <ErrorPage></ErrorPage>;
  return (
    <div className="w-full min-h-[calc(100vh-40px)] flex flex-col justify-center items-center text-gray-800 rounded-xl bg-gray-50">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            {/* Name */}
            <div className="space-y-1 text-sm">
              <label htmlFor="name" className="block text-gray-600">
                Name
              </label>
              <input
                className="w-full px-4 py-3 text-gray-800 border border-lime-300 focus:outline-lime-500 rounded-md bg-white"
                id="name"
                type="text"
                placeholder="Plant Name"
                {...register("name", {
                  required: "Name is required",
                  maxLength: {
                    value: 20,
                    message: "Name must be 20 character",
                  },
                })}
              />
              {errors.name && (
                <p className="text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>
            {/* Category */}
            <div className="space-y-1 text-sm">
              <label htmlFor="category" className="block text-gray-600 ">
                Category
              </label>
              <select
                required
                className="w-full px-4 py-3 border-lime-300 focus:outline-lime-500 rounded-md bg-white"
                {...register("category", { required: "Category is required" })}
              >
                <option value="Indoor">Indoor</option>
                <option value="Outdoor">Outdoor</option>
                <option value="Succulent">Succulent</option>
                <option value="Flowering">Flowering</option>
              </select>
              {errors.category && (
                <p className="text-red-500 mt-1">{errors.category.message}</p>
              )}
            </div>
            {/* Description */}
            <div className="space-y-1 text-sm">
              <label htmlFor="description" className="block text-gray-600">
                Description
              </label>

              <textarea
                id="description"
                placeholder="Write plant description here..."
                className="block rounded-md focus:lime-300 w-full h-32 px-4 py-3 text-gray-800  border border-lime-300 bg-white focus:outline-lime-500 "
                name="description"
                {...register("description", {
                  required: "Description is required",
                })}
              ></textarea>
              {errors.description && (
                <p className="text-red-500 mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-6 flex flex-col">
            {/* Price & Quantity */}
            <div className="flex justify-between gap-2">
              {/* Price */}
              <div className="space-y-1 text-sm">
                <label htmlFor="price" className="block text-gray-600 ">
                  Price
                </label>
                <input
                  className="w-full px-4 py-3 text-gray-800 border border-lime-300 focus:outline-lime-500 rounded-md bg-white"
                  id="price"
                  type="number"
                  placeholder="Price per unit"
                  {...register("price", {
                    required: "price is required",
                    min: { value: 0, message: "Price must be positive" },
                  })}
                />
                {errors.price && (
                  <p className="text-red-500 mt-1">{errors.price.message}</p>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-1 text-sm">
                <label htmlFor="quantity" className="block text-gray-600">
                  Quantity
                </label>
                <input
                  className="w-full px-4 py-3 text-gray-800 border border-lime-300 focus:outline-lime-500 rounded-md bg-white"
                  id="quantity"
                  type="number"
                  placeholder="Available quantity"
                  {...register("quantity", {
                    required: "Quantity is required",
                    min: { value: 0, message: "Quantity must be positive" },
                  })}
                />
                {errors.quantity && (
                  <p className="text-red-500 mt-1">{errors.quantity.message}</p>
                )}
              </div>
            </div>
            {/* Image */}
            <div className=" p-4  w-full  m-auto rounded-lg grow">
              <div className="file_upload px-5 py-3 relative border-4 border-dotted border-gray-300 rounded-lg">
                <div className="flex flex-col w-max mx-auto text-center">
                  <label>
                    <input
                      className="text-sm cursor-pointer w-36 hidden"
                      type="file"
                      name="image"
                      id="image"
                      accept="image/*"
                      hidden
                      {...register("image", {
                        required: "Image is required",
                      })}
                    />
                    {errors.image && (
                      <p className="text-red-500 mt-1">
                        {errors.image.message}
                      </p>
                    )}
                    <div className="bg-lime-500 text-white border border-gray-300 rounded font-semibold cursor-pointer p-1 px-3 hover:bg-lime-500">
                      Upload
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full cursor-pointer p-3 mt-5 text-center font-medium text-white transition duration-200 rounded shadow-md bg-lime-500 "
            >
              {isPending ? (
                <TbFidgetSpinner className="animate-spin m-auto" />
              ) : (
                " Save & Continue"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddPlantForm;
