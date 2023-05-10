import { Button, VStack } from "native-base";


export default function LoginView(): JSX.Element {
  return (
    <VStack alignItems="center">
      <Button bgColor="primary" size="lg">
        Login with Google
      </Button>
    </VStack>
  )
}
