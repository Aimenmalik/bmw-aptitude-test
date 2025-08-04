const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { pool } = require("../config/database");

class CSVImporter {
  static async importElectricCarsData() {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        "SELECT COUNT(*) as count FROM electric_cars"
      );

      if (rows[0].count > 0) {
        connection.release();
        console.log("Data already exists, skipping CSV import");
        return false;
      }

      const csvPath = path.join(
        __dirname,
        "../../data/BMW_Aptitude_Test_Test_Data_ElectricCarData.csv"
      );

      if (!fs.existsSync(csvPath)) {
        console.log("CSV file not found, using sample data instead");
        connection.release();
        return false;
      }

      console.log("Reading CSV file...");
      const data = await this.parseCSV(csvPath);

      if (data.length === 0) {
        console.log("No data found in CSV");
        connection.release();
        return false;
      }

      console.log(`Processing ${data.length} records from CSV...`);

      const insertQuery = `
        INSERT INTO electric_cars 
        (brand, model, accel_sec, top_speed_kmh, range_km, efficiency_whkm, fast_charge_kmh, rapid_charge, power_train, plug_type, body_style, segment, seats, price_euro, date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      let inserted = 0;
      let skipped = 0;

      for (const row of data) {
        try {
          // Proper CSV column mapping to database schema
          const cleanRow = [
            row.Brand || "",
            row.Model || "",
            this.parseFloat(row.AccelSec),
            this.parseInt(row.TopSpeed_KmH),
            this.parseInt(row.Range_Km),
            this.parseInt(row.Efficiency_WhKm),
            row.FastCharge_KmH || "",
            row.RapidCharge || "",
            row.PowerTrain || "",
            row.PlugType || "",
            row.BodyStyle || "",
            row.Segment || "",
            this.parseInt(row.Seats),
            this.parseInt(row.PriceEuro),
            row.Date || "",
          ];

          await connection.execute(insertQuery, cleanRow);
          inserted++;

          if (inserted % 20 === 0) {
            console.log(`Inserted ${inserted} records...`);
          }
        } catch (err) {
          skipped++;
          console.warn(`Skipped row ${inserted + skipped}: ${err.message}`);
        }
      }

      connection.release();
      console.log(`Successfully imported ${inserted} electric cars from CSV`);
      if (skipped > 0) {
        console.log(`Skipped ${skipped} invalid records`);
      }
      return true;
    } catch (error) {
      console.error("CSV import error:", error);
      return false;
    }
  }

  static parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (data) => {
          // Keep original CSV column names for proper mapping
          const cleaned = {};
          Object.keys(data).forEach((key) => {
            // Trim whitespace but preserve original column names
            cleaned[key.trim()] = data[key]?.toString().trim();
          });
          results.push(cleaned);
        })
        .on("end", () => {
          console.log(`CSV parsing completed: ${results.length} rows`);
          resolve(results);
        })
        .on("error", (error) => {
          reject(error);
        });
    });
  }

  static parseInt(value) {
    if (!value || value === "" || value === "N/A") return null;
    const parsed = parseInt(value.toString().replace(/[^\d.-]/g, ""));
    return isNaN(parsed) ? null : parsed;
  }

  static parseFloat(value) {
    if (!value || value === "" || value === "N/A") return null;
    const parsed = parseFloat(value.toString().replace(/[^\d.-]/g, ""));
    return isNaN(parsed) ? null : parsed;
  }
}

module.exports = CSVImporter;
