import { AuthForm } from "@/components/auth-form";
import { signInAction } from "@/lib/actions";

export default function SignInPage() {
  return <AuthForm mode="sign-in" action={signInAction} />;
}
