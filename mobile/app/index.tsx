import { Redirect } from "expo-router";

/** Startpunkten skickar vidare; rotlayouten avgör vart. */
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
