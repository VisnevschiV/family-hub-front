import { useNavigate } from "react-router-dom";
import LoginForm from "../Components/LoginForm.jsx";

function LoginPage({ initialMode = "login" }) {
    const navigate = useNavigate();

    function handleLoginSuccess() {
        navigate("/app");
    }

    return (
        <LoginForm
            onLoginSuccess={handleLoginSuccess}
            initialMode={initialMode}
        />
    );
}

export default LoginPage;