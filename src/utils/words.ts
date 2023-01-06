import { faker } from "@faker-js/faker";

export const generate = (count = 50) => {
  return (
    new Array(count)
      //@ts-ignore
      .fill()
      .map((_) => faker.random.word())
      .join(" ")
  );
};
