type Transaction = {
  id: string;
  itemName: string;
  rentedPrice: number;
  subscriptionPlanName: string;
  subscriptionPrice: number;
  createdAt: string;
  userName: string;
  userEmail: string;
};

export default function TransactionTable({ data }: { data: Transaction[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-md">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-100 text-gray-700 font-semibold">
          <tr>
            <th className="px-4 py-2 text-left">User</th>
            <th className="px-4 py-2 text-left">Email</th>
            <th className="px-4 py-2 text-left">Item</th>
            <th className="px-4 py-2 text-left">Price</th>
            <th className="px-4 py-2 text-left">Plan</th>
            <th className="px-4 py-2 text-left">Plan Price</th>
            <th className="px-4 py-2 text-left">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((tx) => (
            <tr key={tx.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 font-medium">{tx.userName}</td>
              <td className="px-4 py-2 text-xs text-gray-500">
                {tx.userEmail}
              </td>
              <td className="px-4 py-2">{tx.itemName}</td>
              <td className="px-4 py-2 text-green-600">₱{tx.rentedPrice}</td>
              <td className="px-4 py-2">{tx.subscriptionPlanName}</td>
              <td className="px-4 py-2 text-blue-600">
                ₱{tx.subscriptionPrice}
              </td>
              <td className="px-4 py-2">
                {new Date(tx.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
