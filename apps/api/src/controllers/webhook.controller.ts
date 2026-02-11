import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { prisma } from '../lib/prisma';

export class WebhookController {
  static async handleClerk(req: Request, res: Response) {
    // Check if the request is missing the headers
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      return res.status(500).json({ error: 'Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local' });
    }

    // Get the headers
    const svix_id = req.headers["svix-id"] as string;
    const svix_timestamp = req.headers["svix-timestamp"] as string;
    const svix_signature = req.headers["svix-signature"] as string;

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({ error: 'Error occured -- no svix headers' });
    }

    // Get the body
    const body = (req as any).rawBody;

    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: any;

    // Verify the payload with the headers
    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return res.status(400).json({ Error: 'Error occured' });
    }

    // Handle the event
    const eventType = evt.type;

    console.log(`Webhook with and ID of ${evt.data.id} and type of ${eventType}`);

    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name } = evt.data;
      const email = email_addresses[0]?.email_address;
      const name = `${first_name || ''} ${last_name || ''}`.trim();

      try {
        await prisma.user.create({
          data: {
            clerkId: id,
            email: email,
            name: name,
            // Assign a default free plan if available, or handle plan assignment later
          },
        });
        console.log(`User ${id} created in DB`);
      } catch (error) {
        console.error('Error creating user in DB:', error);
        // Don't fail the webhook response, just log the error
      }
    } else if (eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name } = evt.data;
      const email = email_addresses[0]?.email_address;
      const name = `${first_name || ''} ${last_name || ''}`.trim();

      try {
        await prisma.user.update({
          where: { clerkId: id },
          data: {
            email: email,
            name: name,
          },
        });
        console.log(`User ${id} updated in DB`);
      } catch (error) {
        console.error('Error updating user in DB:', error);
      }
    } else if (eventType === 'user.deleted') {
      const { id } = evt.data;
      try {
        await prisma.user.delete({
          where: { clerkId: id },
        });
        console.log(`User ${id} deleted from DB`);
      } catch (error) {
        console.error('Error deleting user from DB:', error);
      }
    }

    return res.status(200).json({ success: true });
  }
}
