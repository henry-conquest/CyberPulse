import { format } from "date-fns"
import { Link } from "wouter"

interface ErrorResponseMessageProps {
  tenantId: string
  text: string
}

const ErrorResponseMessage = (props: ErrorResponseMessageProps) => {
    return (
        <>
          <div className="flex justify-between align-center ml-6 mr-6 mt-4">
            <Link to={`/tenants/${props.tenantId}/details`} className="inline-flex items-center text-sm text-brand-teal hover:underline">
                ← Back
            </Link>
            <span className="text-secondary-600">Last updated: {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</span>
            </div>
            <div className="flex flex-col items-center justify-center mt-20 text-center text-red-600">
                <p className="text-lg font-semibold">Failed to load {props.text}.</p>
                <p className="text-sm text-gray-600 mt-2">Please try again later or check your connection.</p>
            </div>
        </>
    )
}

export default ErrorResponseMessage