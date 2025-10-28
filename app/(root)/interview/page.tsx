import Agent from "@/components/Agent";

const Page = async () => {
  // Temporarily skip user check for testing
  const user = { id: "test-user", name: "Test User" };

  return (
    <>
      <h3>Interview generation</h3>

      <Agent
        userName={user.name}
        userId={user.id}
        type="generate"
      />
    </>
  );
};

export default Page;
