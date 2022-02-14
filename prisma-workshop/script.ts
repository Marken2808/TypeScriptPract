import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// A `main` function so that you can use async/await
async function main() {
  // ... you will write your Prisma Client queries here
  console.log("Hello, starting");

  // const users = await prisma.user.update({
  //   data: {
  //     name: "test123",
  //   },
  //   where: {
  //     id: 123,
  //   },
  // });
  // console.log(users);

  const result = await prisma.post.update({
    data: {
      author: {
        connect: { email: "123@123.com" },
      },
    },
    where: {
      id: 123,
    },
  });
  console.log(result);
}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
