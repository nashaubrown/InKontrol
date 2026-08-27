import { AuthForm } from "@/components/auth-form";
import { signUpAction } from "@/lib/actions";

export default function SignUpPage() {
  return <AuthForm mode="sign-up" action={signUpAction} />;
}
