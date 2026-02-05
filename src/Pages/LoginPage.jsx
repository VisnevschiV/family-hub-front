import { useNavigate } from "react-router-dom";
import LoginForm from "../Components/LoginForm.jsx";

function LoginPage() {
    const navigate = useNavigate();

    function handleLoginSuccess() {
        navigate("/todos");
    }

    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
}

export default LoginPage;