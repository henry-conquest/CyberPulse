const LoadingSpinner = () => {
    return (
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    )
}

export default LoadingSpinner