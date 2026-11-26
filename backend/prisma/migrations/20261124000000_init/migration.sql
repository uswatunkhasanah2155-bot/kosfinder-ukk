-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Admin', 'Owner', 'User');

-- CreateEnum
CREATE TYPE "StatusVerifikasiUser" AS ENUM ('Menunggu', 'Terverifikasi', 'Ditolak');

-- CreateEnum
CREATE TYPE "TipeKos" AS ENUM ('Putra', 'Putri', 'Campur');

-- CreateEnum
CREATE TYPE "StatusKos" AS ENUM ('Menunggu', 'Aktif', 'Nonaktif');

-- CreateEnum
CREATE TYPE "StatusKamar" AS ENUM ('Kosong', 'Dalam Booking', 'Terisi');

-- CreateEnum
CREATE TYPE "StatusBooking" AS ENUM ('Menunggu', 'Disetujui', 'Ditolak', 'Selesai');

-- CreateEnum
CREATE TYPE "JenisBooking" AS ENUM ('Survey', 'Kamar');

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL,
    "no_wa" VARCHAR(20),
    "status_verifikasi" "StatusVerifikasiUser" NOT NULL DEFAULT 'Menunggu',

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "kos" (
    "kos_id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "nama_kos" VARCHAR(100) NOT NULL,
    "alamat" TEXT NOT NULL,
    "kota" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "tipe_kos" "TipeKos" NOT NULL,
    "status_verifikasi" "StatusKos" NOT NULL DEFAULT 'Menunggu',

    CONSTRAINT "kos_pkey" PRIMARY KEY ("kos_id")
);

-- CreateTable
CREATE TABLE "foto_kos" (
    "foto_id" SERIAL NOT NULL,
    "kos_id" INTEGER NOT NULL,
    "path_foto" VARCHAR(255) NOT NULL,

    CONSTRAINT "foto_kos_pkey" PRIMARY KEY ("foto_id")
);

-- CreateTable
CREATE TABLE "fasilitas" (
    "fasilitas_id" SERIAL NOT NULL,
    "nama_fasilitas" VARCHAR(100) NOT NULL,

    CONSTRAINT "fasilitas_pkey" PRIMARY KEY ("fasilitas_id")
);

-- CreateTable
CREATE TABLE "kos_fasilitas" (
    "kos_id" INTEGER NOT NULL,
    "fasilitas_id" INTEGER NOT NULL,

    CONSTRAINT "kos_fasilitas_pkey" PRIMARY KEY ("kos_id","fasilitas_id")
);

-- CreateTable
CREATE TABLE "kamar" (
    "kamar_id" SERIAL NOT NULL,
    "kos_id" INTEGER NOT NULL,
    "no_kamar" VARCHAR(20) NOT NULL,
    "tipe_kamar" VARCHAR(50) NOT NULL,
    "harga" INTEGER NOT NULL,
    "status_kamar" "StatusKamar" NOT NULL DEFAULT 'Kosong',

    CONSTRAINT "kamar_pkey" PRIMARY KEY ("kamar_id")
);

-- CreateTable
CREATE TABLE "booking" (
    "booking_id" SERIAL NOT NULL,
    "kamar_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "jenis_booking" "JenisBooking" NOT NULL DEFAULT 'Survey',
    "tanggal_survey" DATE NOT NULL,
    "durasi_bulan" INTEGER NOT NULL DEFAULT 1,
    "status_booking" "StatusBooking" NOT NULL DEFAULT 'Menunggu',
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("booking_id")
);

-- CreateTable
CREATE TABLE "review" (
    "review_id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "komentar" TEXT,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_pkey" PRIMARY KEY ("review_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "kos_owner_id_idx" ON "kos"("owner_id");

-- CreateIndex
CREATE INDEX "kos_latitude_longitude_idx" ON "kos"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "kos_status_verifikasi_idx" ON "kos"("status_verifikasi");

-- CreateIndex
CREATE INDEX "kos_kota_idx" ON "kos"("kota");

-- CreateIndex
CREATE UNIQUE INDEX "fasilitas_nama_fasilitas_key" ON "fasilitas"("nama_fasilitas");

-- CreateIndex
CREATE INDEX "kamar_kos_id_idx" ON "kamar"("kos_id");

-- CreateIndex
CREATE INDEX "kamar_status_kamar_idx" ON "kamar"("status_kamar");

-- CreateIndex
CREATE UNIQUE INDEX "kamar_kos_id_no_kamar_key" ON "kamar"("kos_id", "no_kamar");

-- CreateIndex
CREATE INDEX "booking_kamar_id_idx" ON "booking"("kamar_id");

-- CreateIndex
CREATE INDEX "booking_user_id_idx" ON "booking"("user_id");

-- CreateIndex
CREATE INDEX "booking_status_booking_idx" ON "booking"("status_booking");

-- CreateIndex
CREATE UNIQUE INDEX "review_booking_id_key" ON "review"("booking_id");

-- AddForeignKey
ALTER TABLE "kos" ADD CONSTRAINT "kos_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foto_kos" ADD CONSTRAINT "foto_kos_kos_id_fkey" FOREIGN KEY ("kos_id") REFERENCES "kos"("kos_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kos_fasilitas" ADD CONSTRAINT "kos_fasilitas_fasilitas_id_fkey" FOREIGN KEY ("fasilitas_id") REFERENCES "fasilitas"("fasilitas_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kos_fasilitas" ADD CONSTRAINT "kos_fasilitas_kos_id_fkey" FOREIGN KEY ("kos_id") REFERENCES "kos"("kos_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kamar" ADD CONSTRAINT "kamar_kos_id_fkey" FOREIGN KEY ("kos_id") REFERENCES "kos"("kos_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_kamar_id_fkey" FOREIGN KEY ("kamar_id") REFERENCES "kamar"("kamar_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;
