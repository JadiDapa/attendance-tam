import { PrismaClient, Role } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting migration of Divisions and Positions...");

  // 1. Inisialisasi Divisi Master (3 Divisi Default)
  const divisions = [
    { name: "Teknisi" },
    { name: "Admin" },
    { name: "General" },
  ];

  const divisionMap = new Map<string, string>(); // name -> id

  for (const div of divisions) {
    const record = await prisma.division.upsert({
      where: { name: div.name },
      update: {},
      create: { name: div.name },
    });
    divisionMap.set(record.name, record.id);
    console.log(`Division '${record.name}' ready (id: ${record.id})`);
  }

  // 2. Inisialisasi Posisi Master per Divisi
  const positionsToCreate = [
    // Teknisi
    { divisionName: "Teknisi", positionName: "Teknisi" },
    { divisionName: "Teknisi", positionName: "End of Service" },
    { divisionName: "Teknisi", positionName: "Supervisor" },
    { divisionName: "Teknisi", positionName: "Programmer" },
    { divisionName: "Teknisi", positionName: "Network Engineer" },
    // Admin
    { divisionName: "Admin", positionName: "Admin" },
    { divisionName: "Admin", positionName: "HR Admin" },
    { divisionName: "Admin", positionName: "Supervisor" },
    // General
    { divisionName: "General", positionName: "Business Development Manager" },
  ];

  const positionMap = new Map<string, string>(); // "divName:posName" -> id

  for (const item of positionsToCreate) {
    const divisionId = divisionMap.get(item.divisionName)!;
    const record = await prisma.position.upsert({
      where: {
        divisionId_name: {
          divisionId,
          name: item.positionName,
        },
      },
      update: {},
      create: {
        name: item.positionName,
        divisionId,
      },
    });
    positionMap.set(`${item.divisionName}:${item.positionName}`, record.id);
    console.log(
      `Position '${item.positionName}' in Division '${item.divisionName}' ready (id: ${record.id})`
    );
  }

  // 3. Pemetaan User Berdasarkan Matriks
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users to evaluate for division and position mapping.`);

  let updatedCount = 0;

  for (const user of users) {
    const pos = user.position?.trim();
    let targetDivisionName: string | null = null;
    let targetPositionName: string | null = null;

    if (pos === "Teknisi") {
      targetDivisionName = "Teknisi";
      targetPositionName = "Teknisi";
    } else if (pos === "Teknisi (EoS)") {
      targetDivisionName = "Teknisi";
      targetPositionName = "End of Service";
    } else if (pos === "Supervisor Teknis" || (user.role === Role.SUPERVISOR && (pos?.toLowerCase().includes("teknis") || pos === "Supervisor"))) {
      targetDivisionName = "Teknisi";
      targetPositionName = "Supervisor";
    } else if (pos === "Admin") {
      targetDivisionName = "Admin";
      targetPositionName = "Admin";
    } else if (pos === "HR Admin") {
      targetDivisionName = "Admin";
      targetPositionName = "HR Admin";
    } else if (pos === "Supervisor Admin" || (user.role === Role.SUPERVISOR && pos?.toLowerCase().includes("admin"))) {
      targetDivisionName = "Admin";
      targetPositionName = "Supervisor";
    } else if (pos === "Programmer" || pos === "Programmer and Network Engineer") {
      targetDivisionName = "Teknisi";
      targetPositionName = "Programmer";
    } else if (pos === "Network Engineer") {
      targetDivisionName = "Teknisi";
      targetPositionName = "Network Engineer";
    } else if (pos === "Business Development Manager") {
      targetDivisionName = "General";
      targetPositionName = "Business Development Manager";
    }

    if (targetDivisionName && targetPositionName) {
      const divisionId = divisionMap.get(targetDivisionName);
      const positionId = positionMap.get(`${targetDivisionName}:${targetPositionName}`);

      if (divisionId && positionId) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            divisionId,
            positionId,
            // Juga update user.position ke nama posisi baru yang terstandardisasi
            position: targetPositionName,
          },
        });
        updatedCount++;
        console.log(`Mapped user ${user.email} -> Division: ${targetDivisionName}, Position: ${targetPositionName}`);
      }
    } else {
      console.log(`User ${user.email} (position: '${user.position}', role: ${user.role}) left as unassigned.`);
    }
  }

  console.log(`Successfully migrated ${updatedCount} users to structured divisions and positions.`);

  // 4. Cleanup divisi 'Engineer' lama jika ada dari eksekusi sebelumnya
  const legacyEngineer = await prisma.division.findUnique({
    where: { name: "Engineer" },
    include: { users: true },
  });

  if (legacyEngineer) {
    if (legacyEngineer.users.length === 0) {
      await prisma.position.deleteMany({
        where: { divisionId: legacyEngineer.id },
      });
      await prisma.division.delete({
        where: { id: legacyEngineer.id },
      });
      console.log("Successfully cleaned up legacy 'Engineer' division and its positions.");
    } else {
      console.warn(
        `Legacy 'Engineer' division still has ${legacyEngineer.users.length} users attached, skipped deletion.`
      );
    }
  }

  // 5. Cleanup posisi gabungan 'Programmer and Network Engineer' lama jika ada
  const legacyCombinedPositions = await prisma.position.findMany({
    where: { name: "Programmer and Network Engineer" },
    include: { users: true },
  });

  for (const legacyPos of legacyCombinedPositions) {
    if (legacyPos.users.length === 0) {
      await prisma.position.delete({
        where: { id: legacyPos.id },
      });
      console.log("Successfully cleaned up legacy position 'Programmer and Network Engineer'.");
    } else {
      console.warn(
        `Position 'Programmer and Network Engineer' still has ${legacyPos.users.length} users attached, skipped deletion.`
      );
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

