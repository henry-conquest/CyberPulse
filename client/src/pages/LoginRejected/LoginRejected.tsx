import logoImg from '../../assets/logo.png';


const LoginRejected = () => {
    return (
        <div className="flex h-screen flex-col items-center justify-center text-center">
            <img src={logoImg} className="w-[30rem] h-auto" />
            <h1 className="mb-5 mt-[-11px] text-3xl font-montserrat text-brand-green">Cyber Risk Management</h1>
            
            <div className="mb-4 rounded-md border border-red-500 bg-red-50 px-4 py-2 text-red-700">
                Your login attempt was rejected. Please contact your administrator.
            </div>
            <a
            href="/api/login"
            className="inline-flex items-center rounded-md bg-brand-teal px-4 py-2 text-white hover:bg-brand-teal/90 font-montserrat pt-[0.5%] pb-[0.5%] pl-[5%] pr-[5%]"
            >
            Login
            </a>
        </div>
    );
}

export default LoginRejected