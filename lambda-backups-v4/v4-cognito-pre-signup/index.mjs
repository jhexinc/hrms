export const handler = async (event) => {
  console.log("PreSignUp event:", JSON.stringify(event, null, 2));

  if (!event.request.userAttributes.email) {
    event.request.userAttributes.email = event.userName;
  }

  return event;
};
