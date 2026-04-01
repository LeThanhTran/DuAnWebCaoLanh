namespace WardWebsite.API.Models
{
    public class Service
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public ICollection<Application> Applications { get; set; } = new List<Application>();
    }
}
